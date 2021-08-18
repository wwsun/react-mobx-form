import { Checkbox, Input, Switch, DatePicker, Select } from '@alifd/next';
import React from 'react';
import { FormItemCreationOptions } from './form-item';

function renderBooleanPreview(props: any) {
  return props.checked ?? props.value ? 'Yes' : 'No';
}

function renderEmptyPreview(props: any) {
  return null as React.ReactElement;
}

function isFalsy(value: any) {
  return !value;
}

function isNullOrUndefined(value: any) {
  return value == null;
}

function isNullOrArrayOfNulls(value: any) {
  return value == null || (Array.isArray(value) && value.every(isNullOrUndefined));
}

export const ALL_COMPONENTS: Array<FormItemCreationOptions & { aliases?: string[] }> = [
  {
    name: 'switch',
    component: Switch,
    valuePropName: 'checked',
    renderPreview: renderBooleanPreview,
    defaultValue: false,
    isEmpty: isNullOrUndefined,
  },
  {
    name: 'checkbox',
    component: Checkbox,
    defaultValue: [],
    renderPreview(props) {
      const map = new Map((props.dataSource ?? []).map(({ value, label }: any) => [value, label]));
      return props.value.map((v: any) => map.get(v) ?? v).join(', ');
    },
    isEmpty(value: any): boolean {
      return value == null || value.length === 0;
    },
  },
  // 'checkboxGroup',
  // 'radioGroup'
  {
    name: 'datePicker',
    component: DatePicker,
    renderPreview: renderEmptyPreview,
    defaultValue: null,
    isEmpty: isFalsy,
  },
  {
    name: 'dateRangePicker',
    aliases: ['rangePicker'],
    component: DatePicker.RangePicker,
    renderPreview: renderEmptyPreview,
    defaultValue: [],
    isEmpty: isNullOrArrayOfNulls,
  },
  {
    name: 'input',
    component: Input,
    renderPreview: renderEmptyPreview,
    defaultValue: '',
    isEmpty: isFalsy,
    hasIntrinsicWidth: false,
  },
  {
    name: 'select',
    component: Select,
    renderPreview: (props) => <Select {...props} isPreview />,
    defaultValue: null,
    isEmpty: isNullOrUndefined,
    hasIntrinsicWidth: false,
  },
  {
    component: null,
    render: (props: any) => <Select {...props} mode="single" />,
    name: 'singleSelect',
    renderPreview: () => null,
    defaultValue: null,
    isEmpty: isFalsy,
    hasIntrinsicWidth: false,
  },
  {
    component: null,
    render: (props: any) => <Select {...props} mode="multiple" />,
    name: 'multipleSelect',
    renderPreview: () => null,
    defaultValue: null,
    isEmpty: isNullOrArrayOfNulls,
    hasIntrinsicWidth: false,
  },
];
