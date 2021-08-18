import React, { createContext, useContext, useState } from "react";
import { observer } from 'mobx-react-lite';
import { composeValue, useHtmlIdPrefix } from "./utils";
import { Field, FormModel } from './models';
import { reaction, toJS } from "mobx";
import { useEffect } from "react";
import { AsyncValue } from './helpers/async-value';
import { FormLayoutParams, FormLayout, FormSubmit, FormReset, FormItemGroup, FormItemView } from './form-ui';

export const ModelContext = createContext<FormModel<any>>(null);
ModelContext.displayName = 'ModelContext';
const ModelProvider = ModelContext.Provider;

export function useModel<T = any>() {
  return useContext(ModelContext) as FormModel<T>;
}

export interface FormEnvContextType {
  onSubmit?(submitValues: any, model: FormModel<any>): void;
  onError?(errors: any, model: FormModel<any>): void;
  onReset?(model: FormModel<any>): void;

  isPreview?: boolean;
  
  validateOnMount?: boolean;
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
  
  writeDefaultValueToModel?: boolean;

  /**
   * 表单内控件的 html id 前缀
   */
  htmlIdPrefix?: string;
}

const FormEnvContext = createContext<FormEnvContextType>({
  isPreview: false,
  validateOnMount: false,
  validateOnBlur: false,
  validateOnChange: false,
});
FormEnvContext.displayName = 'FormEnvContext';

export const useFormEnv = () => useContext(FormEnvContext);
export const FormEnvProvider = ({ children, ...override }: FormEnvContextType & { children: React.ReactNode }) => {
  const parent = useFormEnv();
  return <FormEnvContext.Provider value={{ ...parent, ...override }}>{children}</FormEnvContext.Provider>
}

export interface FormProps extends FormEnvContextType {
  model?: FormModel;
  defaultValue?: unknown;
  style?: React.CSSProperties;
  className?: string;
  layout?: FormLayoutParams;
  children?: React.ReactNode;
}

export function Form({
  model: modelProp,
  defaultValue,
  children,
  className,
  style,
  layout,
  htmlIdPrefix: htmlIdPrefixProp,
  ...restEnvProps
}: FormProps) {
  const [_model] = useState(() => new FormModel(defaultValue));
  const model = composeValue(modelProp, _model);
  const htmlIdPrefix = useHtmlIdPrefix(htmlIdPrefixProp);

  return (<FormEnvProvider htmlIdPrefix={htmlIdPrefix} {...restEnvProps}>
    <ModelProvider value={model}>
      <FormLayout style={style} className={className} {...layout}>
        {children}
      </FormLayout>
    </ModelProvider>
  </FormEnvProvider>)
}

export interface FormEffectProps<T = any> {
  watch: (() => T) | string | Field<T> | AsyncValue<T> | Array<string | Field> | AsyncValue<any>;
  effect(value: T, detail: { prev: T; next: T; model: FormModel<any> }): void;
  fireImmediately?: boolean;
  deps?: unknown[];
}

const FormEffect = observer(function FormEffect<T = any>({
  watch,
  effect,
  fireImmediately,
  deps = []
}: FormEffectProps<T>) {
  const model = useModel();

  const boundEffect = (next: T, prev: T) => {
    effect(next, { model, prev, next });
  };

  const boundReaction = (expression: () => T) => {
    return reaction(expression, boundEffect, { fireImmediately });
  };

  useEffect(() => {
    if (typeof watch === 'string') {
      return boundReaction(() => toJS(model.getValue(watch)) as T);
    } else if (typeof watch === 'function') {
      return boundReaction(watch);
    } else if (watch instanceof Field) {
      return boundReaction(() => watch.value);
    } else if (watch instanceof AsyncValue) {
      return boundReaction(() => watch.current);
    } else if (Array.isArray(watch)) {
      return boundReaction(() => {
        return watch.map((t) => {
          if (typeof t === 'string') {
            return toJS(model.getValue(t));
          } else if (t instanceof AsyncValue) {
            return t.current;
          } else {
            return t.value;
          }
        }) as any;
      })
    } else {
      console.warn('[Form] invalid watch args', watch);
    }
  }, deps);

  return null as React.ReactElement;
});

const FormModelConsumer = observer(({ children }: React.ConsumerProps<FormModel<any>>) => {
  const model = useModel();
  return children(model) as React.ReactElement;
});

export interface FormArrayLayoutInput {
  arrayModel: FormModel<unknown[]>;
  itemCount: number;
  itemContent: React.ReactNode;
  itemFactory(arrayModel: FormModel<unknown[]>): any;
}

export interface FormArrayProps {
  name: string;
  layout(input: FormArrayLayoutInput): React.ReactElement;
  children: React.ReactNode;
  itemFactory?(arrayModel: FormModel<unknown[]>): any;
}

const FormArray = observer(({ name, children, layout, itemFactory }: FormArrayProps) => {
  const parent = useModel();
  const arrayModel = (name === '&' ? parent : parent.getSubModel(name)) as FormModel<unknown[]>;
  const itemCount = arrayModel.values?.length ?? 0;

  return (<ModelProvider value={arrayModel as FormModel<unknown[]>}>
    {layout({ arrayModel, itemContent: children, itemCount, itemFactory })};
  </ModelProvider>)
});

const FormObject = observer(({ name, children }: { children: React.ReactNode; name: string }) => {
  const parent = useModel();
  const model = (name === '&' ? parent : parent.getSubModel(name)) as FormModel;
  return <ModelProvider value={model} children={children} />
});

Form.Submit = FormSubmit;
Form.Reset = FormReset;
Form.Effect = FormEffect;
Form.Array = FormArray;
Form.Object = FormObject;
Form.ModelProvider = ModelProvider;
Form.ModelConsumer = FormModelConsumer;
Form.ItemGroup = FormItemGroup;
Form.ItemView = FormItemView;
