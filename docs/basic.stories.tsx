import React, { useState } from 'react';
import { Observer } from 'mobx-react-lite';
import { Form, FormItem, FormModel } from 'mobx-react-lite-form';
import { FormValuePreview } from './helpers';

export default {
  title: 'MobxForm/Basic',
};

const model1 = new FormModel({
  name: 'lily',
  phone: '123',
  address: 'foo street',
});

export function Basic() {
  return (
    <Form model={model1} onSubmit={console.log}>
      <FormItem component="input" label="Name" name="name" required />
      <FormItem component="input" label="Phone" name="phone" required />
      <FormItem component="input" label="Address" name="address" required />
      <Form.Submit />
      &nbsp;&nbsp;
      <Form.Reset />
      <FormValuePreview />
    </Form>
  );
}

export function Nested() {
  return (
    <Form>
      <FormItem component="input" label="foo.bar.buzz" name="foo.bar.buzz" required />
      <FormValuePreview />
    </Form>
  );
}

const ALL_CITIES = [
  { prov: '浙江', cities: '杭州 绍兴 宁波 其他'.split(' ') },
  { prov: '江苏', cities: '南京 苏州 无锡 其他'.split(' ') },
  { prov: '山东', cities: '济南 青岛 其他'.split(' ') },
];

const model2 = new FormModel({
  prov: '浙江',
  cities: ['杭州', '绍兴'],
});

export function BasicEffect() {
  const prov = model2.getField('prov');
  const cities = model2.getField('cities');

  return (
    <Observer>
      {() => (
        <Form model={model2}>
          <FormItem
            component="singleSelect"
            label="prov"
            field={prov}
            componentProps={{ dataSource: ALL_CITIES.map((item) => item.prov) }}
          />
          <FormItem
            component="multipleSelect"
            label="city"
            field={cities}
            componentProps={{
              dataSource: ALL_CITIES.find((item) => {
                console.log('>>> data', prov.value);
                return item.prov === prov.value;
              }).cities,
              hasClear: true,
              onVisibleChange() {
                console.log('>>>', prov.value);
              },
            }}
          />
          <Form.Effect
            watch={prov}
            effect={() => {
              cities.value = [];
            }}
          />
          <FormValuePreview />
        </Form>
      )}
    </Observer>
  );
}

export function TupleField() {
  const [model] = useState(
    () =>
      new FormModel({
        start: '',
        end: '',
        dateRange: ['', ''],
      }),
  );

  return (
    <Form model={model}>
      <FormItem label="tuple1" component="rangePicker" field={model.getTupleField('start', 'end')} />
      <FormItem label="tuple2" component="rangePicker" name="dateRange" />
      <FormValuePreview />
    </Form>
  );
}
