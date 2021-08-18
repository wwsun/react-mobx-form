import { action, observable, runInAction, toJS } from 'mobx';
import { observableSetIn } from './common';
import { FormEnvContextType } from '../form';
import { FieldValidateTrigger, FormModel } from '../models';

export const clearError = action(function <T>(model: FormModel<T>) {
  model.interateFields((field) => {
    field.state.error = null;
  });
});

export const validateAll = action(function <T>(model: FormModel<T>, trigger: FieldValidateTrigger = '*') {
  let hasError = false;
  const errors: any = observable(model._valueShape === 'array' ? [] : {});
  const promises: Promise<unknown>[] = [];

  model.interateFields((field) => {
    if (!field.isMounted) {
      return;
    }

    promises.push(
      field.validate(trigger).then(
        action((error) => {
          if (error) {
            hasError = true;
            observableSetIn(errors, field.path, error);
          }
        }),
      ),
    );
  });

  return Promise.all(promises).then(() => ({ hasError, errors: toJS(errors) }));
});

type SubmitOptions = Pick<FormEnvContextType, 'onSubmit' | 'onError'> & {
  valueFilter?: 'mounted' | 'all';
};

export const submit = action(async function <T>(model: FormModel<T>, options: SubmitOptions = {}) {
  const { onError, onSubmit, valueFilter = 'mounted' } = options;
  const { hasError, errors } = await validateAll(model);

  if (hasError) {
    onError?.(errors, model);
  } else if (typeof onSubmit === 'function') {
    if (valueFilter === 'all') {
      onSubmit(toJS(model.values), model);
    } else {
      runInAction(() => {
        const mountedValues: any = observable(model._valueShape === 'array' ? [] : {});

        model.interateFields((field) => {
          if (!field.isMounted) {
            return;
          }

          if (field.value !== undefined) {
            observableSetIn(mountedValues, field.path, field.value);
          }
        });

        onSubmit(toJS(mountedValues), model);
      });
    }
  }
});

export const reset = action(function <T>(model: FormModel<T>, { onReset }: Pick<FormEnvContextType, 'onReset'>) {
  model.values = {} as T;
  clearError(model);
  onReset?.(model);
});
