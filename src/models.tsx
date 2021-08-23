import React from 'react';
import invariant from 'invariant';
import { action, computed, makeObservable, observable } from 'mobx';
import { observableGetIn, splitToPath, observableSetIn, keyToValueShape, composeValue } from './utils';

type valueOf<T> = T[keyof T];

export type XName<D> = 0 extends D & 1
  ? any
  : D extends (infer U)[]
  ? number | `${number}` | `${number}.${XName<U>}`
  : D extends object
  ? valueOf<{ [K in keyof D & string]: K | `${K}.${XName<D[K]>}` }>
  : never;

type IfAny<T, TRUE, FALSE> = 0 extends T & 1 ? TRUE : FALSE;

type ResolveXName<D, Path extends string | number> = 0 extends Path & 1
  ? any
  : string extends Path
  ? IfAny<D, any, unknown>
  : Path extends number
  ? D extends Array<infer U>
    ? U
    : unknown
  : Path extends keyof D
  ? D[Path]
  : Path extends `${infer K}.${infer R}`
  ? K extends keyof D
    ? ResolveXName<D[K], R>
    : unknown
  : unknown;

export type ValueShape = 'array' | 'object';

export type FieldValidateTrigger = '*' | 'blur' | 'change' | 'mount';

export interface FieldConfig<D> {
  label?: React.ReactNode;
  help?: React.ReactNode;
  tip?: React.ReactNode;
  error?: React.ReactNode;

  defaultValue?: any;
  isEmpty?(value: any): boolean;
  required?: boolean;
  requiredMessage?: string;
  writeDefaultValueToModel?: boolean;

  validate?(value: any, field: Field<D>, trigger: FieldValidateTrigger): undefined | null | string | Promise<any>;
  validateOnMount?: boolean;
  validateOnChange?: boolean;
  validateOnBlur?: boolean;

  disabled?: boolean;
  readOnly?: boolean;
  status?: string;
}

enum ModelType {
  rootModel = 'rootModel',
  subModel = 'subModel',
}

type FormModelCreateOptions =
  | { modelType: ModelType.rootModel }
  | {
      modelType: ModelType.subModel;
      parent: FormModel;
      name: string;
    };

const ROOT_MODEL_CREATE_OPTIONS: FormModelCreateOptions = {
  modelType: ModelType.rootModel,
};

const EMPTY_PATH = [] as string[];

class IdGenerator {
  _nextId = 1;

  constructor(readonly prefix: string) {
    this.prefix = prefix;
  }

  getNextId() {
    return `${this.prefix}_${this._nextId++}`;
  }
}

export interface IModel<D = unknown> {
  readonly root: FormModel;
  readonly path: string[];
  readonly parent: IModel;

  state: any;

  values: D;

  getValue<N extends XName<D>>(name: N, defaultValue?: ResolveXName<D, N>): ResolveXName<D, N>;
  setValue<N extends XName<D>>(name: N, value: ResolveXName<D, N>): void;
  // getSubModel<N extends XName<D>>(name: N): SubModel<ResolveXName<D, N>>;

  // getField<N extends XName<D>>(name: N): Field<ResolveXName<D, N>>;

  // getTupleField<NS extends (keyof D & string)[]>(
  //   ...tupleParts: NS
  // ): Field<{ [Index in keyof NS]: NS[Index] extends keyof D ? D[NS[Index]] : never }>;

  // // internals
  // readonly _proxy: SubModelProxy;

  // _asField(): Field<D>;
}

export class FormModel<D extends { [key: string]: any } = unknown> implements IModel<D> {
  _modelIdGenerator: IdGenerator;
  _fieldIdGenerator: IdGenerator;

  public readonly id: string;
  public state: any = {};
  public readonly root: FormModel<any>;
  public readonly parent: FormModel<any>;
  public name: string;

  _modelType: ModelType;
  _values: D;
  _fieldMap = new Map<string, Field>();
  _valueShape: 'auto' | ValueShape = 'auto';
  _subModles: D extends any[] ? FormModel[] : { [key: string]: FormModel };

  get values(): D {
    if (this._modelType === ModelType.rootModel) {
      return this._values;
    } else {
      return this.parent.getValue(this.name);
    }
  }

  set values(nextValues: D) {
    if (this._modelType === ModelType.rootModel) {
      this._values = nextValues;
    } else {
      this.parent.setValue(this.name, nextValues);
    }
  }

  get path(): string[] {
    if (this._modelType === ModelType.rootModel) {
      return EMPTY_PATH;
    } else {
      return [...this.parent.path, this.name];
    }
  }

  constructor(initValues?: D, options = ROOT_MODEL_CREATE_OPTIONS) {
    if (options!.modelType === 'subModel') {
      this._modelType = ModelType.subModel;
      this.parent = options.parent;
      this.root = this.parent.root;
      this.name = options.name;
      this.id = this.root._modelIdGenerator.getNextId();
    } else {
      this._modelType = ModelType.rootModel;
      this.parent = this;
      this.root = this;
      this.name = '';

      this._modelIdGenerator = new IdGenerator('Model');
      this._fieldIdGenerator = new IdGenerator('Field');
      this.id = this._modelIdGenerator.getNextId();

      this._values = composeValue(initValues, {} as any);
    }

    makeObservable(
      this,
      {
        _values: this._modelType === ModelType.rootModel ? observable : false,
        values: computed,
        state: observable,
        setValue: action,
        name: observable.ref, // name is dynamic, when it acts an array item with position changed
        path: computed,
      },
      {
        name: `${this.id})(${this.name})`,
      },
    );
  }

  getValue<N extends XName<D>>(name: N, defaultValue?: ResolveXName<D, N>): ResolveXName<D, N> {
    return observableGetIn(this.values, String(name), defaultValue);
  }

  setValue<N extends XName<D>>(name: N, value: ResolveXName<D, N>) {
    if (this._modelType === ModelType.subModel && this.values == null) {
      this._updateValueShape(keyToValueShape(splitToPath(String(name))[0]));
      this.values = (this._valueShape === 'array' ? [] : {}) as D;
    }
    observableSetIn(this.values, name, value);
  }

  getSubModel<N extends XName<D>>(name: N | string[]): FormModel<ResolveXName<D, N>> {
    const path = Array.isArray(name) ? name : splitToPath(name);
    let mod: FormModel = this;
    for (let i = 0; i < path.length - 1; i++) {
      mod = mod._getSubModelByShortName(path[i]);
    }
    return mod._getSubModelByShortName(path[path.length - 1]);
  }

  getField<N extends XName<D>>(name: N | string[]): Field<ResolveXName<D, N>> {
    const path = Array.isArray(name) ? name : splitToPath(name);

    if (path.length > 1) {
      const lastName = path[path.length - 1];
      const subModel = this.getSubModel(path.slice(0, -1));
      return subModel.getField([lastName]) as any;
    }

    const shortName = path[0];
    this._updateValueShape(keyToValueShape(shortName));

    let field: Field<any> = this._fieldMap.get(shortName);
    if (field == null) {
      field = new Field({ fieldType: FieldType.normal, parent: this, name: shortName });
      this._fieldMap.set(shortName, field);
    }

    return field;
  }

  getTupleField<NS extends (keyof D & string)[]>(
    ...tupleParts: NS
  ): Field<{ [Index in keyof NS]: NS[Index] extends keyof D ? D[NS[Index]] : never }> {
    this._updateValueShape('object');
    const name = `tuple(${tupleParts.join(',')})`;

    let field: Field<any> = this._fieldMap.get(name);
    if (field == null) {
      field = new Field({
        fieldType: FieldType.tuple,
        parent: this,
        name,
        tupleParts,
      });
      this._fieldMap.set(name, field);
    }

    return field;
  }

  // experiment api
  getComputedField<T>(name: string, get: () => T, set?: (value: T) => void): Field<T> {
    let field: Field<any> = this._fieldMap.get(name);
    if (field == null) {
      field = new Field({
        fieldType: FieldType.computed,
        parent: this,
        name,
        get,
        set,
      });
      this._fieldMap.set(name, field);
    }

    return field;
  }

  _asField() {
    if (this._modelType === ModelType.rootModel) {
      throw new Error('FormModel (Root Node) can not use Field as name=& ');
    }
    return this.parent.getField(this.name) as Field<D>;
  }

  _updateValueShape(valueShape: 'array' | 'object') {
    if (this._valueShape === 'auto') {
      this._valueShape = valueShape;
      this._subModles = valueShape === 'object' ? {} : ([] as any);
    } else {
      invariant(this._valueShape === valueShape, '[Form] Model structure should be persistant');
    }
  }

  // 递归前序遍历 model 下所有的 model 对象（包含自身）
  _iterateModels(iteratee: (mod: FormModel) => void) {
    iteratee(this);
    if (this._subModles !== null) {
      for (const subModel of Object.values(this._subModles)) {
        subModel._iterateModels(iteratee);
      }
    }
  }

  // 递归遍历该model下所有存在 Field 对象
  interateFields(iteratee: (fd: Field) => void) {
    this._iterateModels((model) => {
      model._fieldMap.forEach((field) => {
        field._forkMap.forEach(iteratee);
      });
    });
  }

  _getSubModelByShortName(name: string): FormModel<any> {
    this._updateValueShape(keyToValueShape(name));

    let subModel = this._subModles[name];

    if (subModel == null) {
      subModel = new FormModel(null, {
        modelType: ModelType.subModel,
        parent: this,
        name,
      });
      (this._subModles as any)[name] = subModel;
    }

    return subModel;
  }
}

export interface FieldState {
  error?: any;
  validating?: boolean;
  cancelValidation?(): void;

  [key: string]: any;
}

export enum FieldType {
  normal = 'normal',
  tuple = 'tuple',
  computed = 'computed',
}

type FieldCreateCommon = {
  parent: FormModel;
  name: string;
  forkName?: string;
};

type FieldCreateOptions =
  | ({ fieldType: FieldType.normal } & FieldCreateCommon)
  | ({ fieldType: FieldType.tuple; tupleParts: string[] } & FieldCreateCommon)
  | ({ fieldType: FieldType.computed; get(): any; set?(v: any): void } & FieldCreateCommon);

export class Field<V = unknown> {
  static ORIGINAL = 'original';

  // 字段配置的最新缓存
  config?: FieldConfig<V> = null;

  // 字段是否在视图中渲染
  isMounted = false;

  readonly parent: FormModel<any>;
  readonly name: string;
  readonly _forkName: string;
  readonly _tupleParts: string[];
  readonly id: string;
  readonly _forkMap: Map<string, Field>;
  readonly fieldType: FieldType;

  readonly _get: () => any;
  readonly _set: (v: any) => void;

  state: FieldState = {};

  get value(): V {
    if (this.fieldType === FieldType.normal) {
      return this.parent.getValue(this.name) as any;
    } else if (this.fieldType === FieldType.tuple) {
      return this._tupleParts.map((part) => this.parent.getValue(part)) as any;
    } else {
      return this._get();
    }
  }

  set value(value: V) {
    if (this.fieldType === FieldType.normal) {
      this.parent.setValue(this.name, value);
    } else if (this.fieldType === FieldType.tuple) {
      this._tupleParts.forEach((part, index) => {
        this.parent.setValue(part, value[index]);
      });
    } else {
      if (this._set) {
        this._set(value);
      } else {
        throw new Error('cannot assign value to a readonly computed field');
      }
    }
  }

  get path() {
    return this.parent.path.concat([this.name]);
  }

  constructor(opts: FieldCreateOptions) {
    this.fieldType = opts.fieldType;
    this.parent = opts.parent;
    this.name = opts.name;
    this.id = this.parent.root._fieldIdGenerator.getNextId();
    this._forkName = opts.forkName ?? Field.ORIGINAL;

    if (opts.fieldType === FieldType.tuple) {
      this._tupleParts = opts.tupleParts;
    } else if (opts.fieldType === FieldType.computed) {
      this._get = opts.get;
      this._set = opts.set;
    }

    const name = this.name;
    const forkName = this._forkName;

    makeObservable(
      this,
      {
        state: observable,
        value: computed,
        path: computed,
        validate: action,
        handleBlur: action,
        handleChange: action,
      },
      {
        name: `${this.id}(${name}${forkName === Field.ORIGINAL ? '' : '#' + forkName})`,
      },
    );

    if (forkName === Field.ORIGINAL) {
      this._forkMap = new Map();
    } else {
      const original = this.parent.getField(name);
      this._forkMap = original._forkMap;
    }
    this._forkMap.set(forkName, this);
  }

  _track(config: FieldConfig<V>) {
    if (this.isMounted) {
      return;
    }

    this.config = config;
    this.isMounted = true;

    return () => {
      this.config = null;
      this.isMounted = false;
    };
  }

  getFork(forkName: string): Field<V> {
    if (this._forkMap.has(forkName)) {
      return this._forkMap.get(forkName) as Field<V>;
    } else {
      const common = {
        parent: this.parent,
        name: this.name,
        forkName,
      };

      if (this.fieldType === FieldType.normal) {
        return new Field({
          fieldType: FieldType.normal,
          ...common,
        });
      } else if (this.fieldType === FieldType.tuple) {
        return new Field({
          fieldType: FieldType.tuple,
          tupleParts: this._tupleParts,
          ...common,
        });
      } else {
        return new Field({
          fieldType: FieldType.computed,
          get: this._get,
          set: this._set,
          ...common,
        });
      }
    }
  }

  async validate(trigger: FieldValidateTrigger = '*') {
    if (!this.isMounted) {
      return;
    }

    const {
      validate,
      defaultValue,
      isEmpty,
      required,
      requiredMessage,
      validateOnMount,
      validateOnBlur,
      validateOnChange,
    } = this.config;

    const value = composeValue(this.value, defaultValue);

    const needValidate =
      trigger === '*' ||
      (validateOnBlur && trigger === 'blur') ||
      (validateOnMount && trigger === 'mount') ||
      (validateOnChange && trigger === 'change');

    if (!needValidate) {
      return;
    }

    const actualValidate = async () => {
      if (required && isEmpty(value)) {
        return requiredMessage;
      }
      if (validate) {
        return validate(value, this, trigger);
      }
      return null;
    };

    let cancelled = false;
    this.state.cancelValidation?.();
    this.state.validating = true;
    this.state.cancelValidation = action(() => {
      cancelled = true;
      this.state.cancelValidation = null;
      this.state.validating = false;
    });

    return actualValidate().then(
      action((error) => {
        if (cancelled) {
          return;
        }
        this.state.cancelValidation = null;
        this.state.validating = false;
        this.state.error = error;
        return error;
      }),
    );
  }

  handleFoucs = () => {};

  handleBlur = () => {
    return this.validate('blur');
  };

  handleChange = (nextValue: any) => {
    this.value = composeValue(nextValue, this.config?.defaultValue);
    return this.validate('change');
  };
}
