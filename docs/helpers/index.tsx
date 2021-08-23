import React from 'react';
import { FormModel, useModel } from 'mobx-react-lite-form';
import { toJS } from 'mobx';
import ReactJson from 'react-json-view';
import { observer } from 'mobx-react-lite';

export interface FormValuePreviewProps {
  style?: React.CSSProperties;
  defaultShow?: boolean;
  model?: FormModel;
}

export const FormValuePreview = observer(({ defaultShow = true, model: modelProp }: FormValuePreviewProps) => {
  const ctxModel = useModel();
  const model = modelProp ?? ctxModel;
  const data = toJS(model.values) as object;
  const showReactJson = model.state.showReactJson ?? defaultShow;

  return <div>{showReactJson && <ReactJson name="Preview" src={data} />}</div>;
});
