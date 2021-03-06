/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { transformActionParams } from './transform_action_params';

test('skips non string parameters', () => {
  const params = {
    boolean: true,
    number: 1,
    empty1: null,
    empty2: undefined,
    date: '2019-02-12T21:01:22.479Z',
  };
  const result = transformActionParams(params, {}, {});
  expect(result).toMatchInlineSnapshot(`
Object {
  "boolean": true,
  "date": "2019-02-12T21:01:22.479Z",
  "empty1": null,
  "empty2": undefined,
  "number": 1,
}
`);
});

test('missing parameters get emptied out', () => {
  const params = {
    message1: '{{context.value}}',
    message2: 'This message "{{context.value2}}" is missing',
  };
  const result = transformActionParams(params, {}, {});
  expect(result).toMatchInlineSnapshot(`
Object {
  "message1": "",
  "message2": "This message \\"\\" is missing",
}
`);
});

test('context parameters are passed to templates', () => {
  const params = {
    message: 'Value "{{context.foo}}" exists',
  };
  const result = transformActionParams(params, {}, { foo: 'fooVal' });
  expect(result).toMatchInlineSnapshot(`
Object {
  "message": "Value \\"fooVal\\" exists",
}
`);
});

test('state parameters are passed to templates', () => {
  const params = {
    message: 'Value "{{state.bar}}" exists',
  };
  const result = transformActionParams(params, { bar: 'barVal' }, {});
  expect(result).toMatchInlineSnapshot(`
Object {
  "message": "Value \\"barVal\\" exists",
}
`);
});

test('works recursively', () => {
  const params = {
    body: {
      message: 'State: "{{state.value}}", Context: "{{context.value}}"',
    },
  };
  const result = transformActionParams(params, { value: 'state' }, { value: 'context' });
  expect(result).toMatchInlineSnapshot(`
Object {
  "body": Object {
    "message": "State: \\"state\\", Context: \\"context\\"",
  },
}
`);
});
