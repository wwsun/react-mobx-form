import React from 'react';
import { Form, FormItem, FormModel } from 'mobx-form';

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
    </Form>
  );
}
