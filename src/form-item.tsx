import { runInAction, toJS } from 'mobx';
import React from 'react';
import { pick } from 'lodash';
import { composeValue } from './utils';
import { useFormEnv, useModel } from './form';
import { Field, FieldConfig, FormModel } from './models';
import { useLayoutEffect } from 'react';
import { useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import { ALL_COMPONENTS } from './components';
import { FormItemView } from './form-ui';

function isFalsyOrEmptyArray(value: any) {
  return !value || (Array.isArray(value) && value.length === 0);
}

function getHtmlId(prefix: string, field: Field) {
  if (prefix == null || typeof prefix !== 'string') {
    return undefined;
  }

  const path = field.path.join('.');
  const fork = field._forkName !== Field.ORIGINAL ? `#${field._forkName}` : '';
  return `${prefix}${path}${fork}`;
}

function resolveField(fieldProp: Field<any>, model: FormModel<any>, name: string) {
  let field: Field<any>;

  if (fieldProp != null) {
    field = fieldProp;
  } else if (name === '&') {
    field = model._asField();
  } else if (name != null) {
    field = model.getField(name);
  } else {
    throw new Error('<FormItem /> should be used with name or field');
  }

  return field;
}

export interface FormItemComponentProps {
  value?: any;
  onChange?(...args: any[]): void;
  onFoucs?(...args: any[]): void;
  onBlur?(...args: any[]): void;
  readOnly?: any;
  disabled?: any;

  [prop: string]: any;
}

export interface FormItemCreationOptions {
  name: string;
  component?: React.ComponentType<FormItemComponentProps>;
  render?(arg: FormItemComponentProps): React.ReactElement;
  valuePropName?: string;
  statusPropName?: string;
  renderPreview?(props: FormItemComponentProps): React.ReactNode;
  defaultValue?: any;
  isEmpty?(value: any): boolean;
  /**
   * 组件是否有固有宽度
   */
  hasIntrinsicWidth?: boolean;
}

function processCreationOptions(
  options: FormItemCreationOptions,
): Required<Omit<FormItemCreationOptions, 'component'>> {
  const render = options.render ?? ((props) => React.createElement(options.component, props));

  return {
    name: options.name,
    statusPropName: composeValue(options.statusPropName, 'state'),
    valuePropName: composeValue(options.valuePropName, 'value'),
    hasIntrinsicWidth: options.hasIntrinsicWidth !== false,
    defaultValue: composeValue(options.defaultValue, null),
    isEmpty: options.isEmpty ?? isFalsyOrEmptyArray,
    render,
    renderPreview: options.renderPreview ?? render,
  };
}

export interface FormItemProps extends FieldConfig<any> {
  component: string;
  componentProps?: any;
  dataSource?: any;
  style?: React.CSSProperties;
  className?: string;

  name?: string;
  field?: Field;

  value?: any;
  onChange?(nextValue: any): void;
  onFocus?(): void;
  onBlur?(): void;
  renderPreview?(props: FormItemProps): React.ReactNode;

  labelWidth?: number | string;
  controlWidth?: number | string;
  rightNode?: React.ReactNode;
  isPreview?: boolean;

  // merged to field.config
  config?: object;
}

export function createFormItem(inputOptions: FormItemCreationOptions) {
  const options = processCreationOptions(inputOptions);

  function FormItemComponent({
    defaultValue: defaultValueProp,
    isEmpty = options.isEmpty,
    renderPreview = options.renderPreview,
    componentProps: componentPropsProp,
    name,
    field: fieldProp,
    config,
    ...props
  }: Omit<FormItemProps, 'component'>) {
    const formEnv = useFormEnv();
    const model = useModel();
    const field = resolveField(fieldProp, model, name);

    const isPreview = composeValue(props.isPreview, formEnv.isPreview);
    const error = composeValue(props.error, field.state.error);
    const defaultValue = composeValue(defaultValueProp, options.defaultValue);
    const value = toJS(composeValue(field.value, defaultValue));
    const htmlId = getHtmlId(formEnv.htmlIdPrefix, field);

    const componentProps = {
      id: htmlId,
      ...pick(props, ['dataSource', 'readOnly', 'disabeld']),
      ...componentPropsProp,
      [options.statusPropName]: composeValue(
        componentPropsProp?.[options.statusPropName],
        composeValue(props[options.statusPropName], error ? 'error' : undefined),
      ),
      [options.valuePropName]: composeValue(props[options.valuePropName], value),
      onChange: composeValue(props.onChange, field.handleChange),
      onFoucs: composeValue(props.onFocus, field.handleFoucs),
      onBlur: composeValue(props.onBlur, field.handleBlur),
    };

    const fieldConfig: FieldConfig<unknown> = {
      defaultValue,
      isEmpty,
      validateOnChange: formEnv.validateOnChange,
      validateOnBlur: formEnv.validateOnBlur,
      validateOnMount: formEnv.validateOnMount,
      writeDefaultValueToModel: formEnv.writeDefaultValueToModel,
      ...props,
      ...config,
    };

    // 利用 useLayoutEffect 将 fieldConfig 设置到 field.config 上
    useLayoutEffect(() => field._track(fieldConfig));

    useLayoutEffect(() => {
      if (fieldConfig.writeDefaultValueToModel) {
        if (field.value === undefined && defaultValueProp != null) {
          runInAction(() => {
            field.value = fieldConfig.defaultValue;
          });
        }
      }
    }, [field, fieldConfig.defaultValue]);

    useEffect(() => {
      if (fieldConfig.validateOnMount) {
        field.validate('mount');
        const cancel = field.state.cancelValidation;
        return () => {
          cancel?.();
        };
      }
    }, []);

    return (
      <FormItemView
        htmlId={htmlId}
        label={props.label}
        help={props.help}
        required={props.required}
        error={error}
        tip={props.tip}
        style={props.style}
        className={props.className}
        labelWidth={props.labelWidth}
        rightNode={props.rightNode}
      >
        {isPreview ? renderPreview(componentProps) : options.render(componentProps)}
      </FormItemView>
    );
  }

  FormItemComponent.displayName = `FormItem_${options.name}`;
  return observer(FormItemComponent);
}

const COMPONENT_DICT: { [name: string]: React.FunctionComponent<any> } = {};
for (const config of ALL_COMPONENTS) {
  const Component = createFormItem(config);
  COMPONENT_DICT[config.name] = Component;
  if (config.aliases) {
    for (const alias of config.aliases) {
      COMPONENT_DICT[alias] = Component;
    }
  }
}

const NotFound = createFormItem({
  name: 'notFound',
  isEmpty: () => false,
  render({ component }: FormItemComponentProps) {
    return (<div>
      <code>invalid component</code>
    </div>)
  }
});

export function FormItem({ component, ...props }: FormItemProps) {
  const Comp = COMPONENT_DICT[component];
  if (Comp == null) {
    return <NotFound {...props} componentProps={{ component }} />
  }

  return React.createElement(Comp, props);
}

FormItem.register = (options: FormItemCreationOptions) => {
  COMPONENT_DICT[options.name] = createFormItem(options);
};

FormItem.COMPONENT_DICT = COMPONENT_DICT;

