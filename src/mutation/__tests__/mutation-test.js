import { describe, it } from 'mocha';
import { expect } from 'chai';

import {
  GraphQLInt,
  GraphQLObjectType,
  GraphQLSchema,
  graphql,
  graphqlSync,
} from 'graphql';

import { mutationWithClientMutationId } from '../mutation';

function dummyResolve() {
  return { result: 1 };
}

const simpleMutation = mutationWithClientMutationId({
  name: 'SimpleMutation',
  inputFields: {},
  outputFields: {
    result: {
      type: GraphQLInt,
    },
  },
  mutateAndGetPayload: dummyResolve,
});

const simpleMutationWithDescription = mutationWithClientMutationId({
  name: 'SimpleMutationWithDescription',
  description: 'Simple Mutation Description',
  inputFields: {},
  outputFields: {
    result: {
      type: GraphQLInt,
    },
  },
  mutateAndGetPayload: dummyResolve,
});

const simpleMutationWithDeprecationReason = mutationWithClientMutationId({
  name: 'SimpleMutationWithDeprecationReason',
  inputFields: {},
  outputFields: {
    result: {
      type: GraphQLInt,
    },
  },
  mutateAndGetPayload: dummyResolve,
  deprecationReason: 'Just because',
});

const simpleMutationWithThunkFields = mutationWithClientMutationId({
  name: 'SimpleMutationWithThunkFields',
  inputFields: () => ({
    inputData: {
      type: GraphQLInt,
    },
  }),
  outputFields: () => ({
    result: {
      type: GraphQLInt,
    },
  }),
  mutateAndGetPayload: ({ inputData }) => ({ result: inputData }),
});

const simplePromiseMutation = mutationWithClientMutationId({
  name: 'SimplePromiseMutation',
  inputFields: {},
  outputFields: {
    result: {
      type: GraphQLInt,
    },
  },
  mutateAndGetPayload: () => Promise.resolve({ result: 1 }),
});

const simpleRootValueMutation = mutationWithClientMutationId({
  name: 'SimpleRootValueMutation',
  inputFields: {},
  outputFields: {
    result: {
      type: GraphQLInt,
    },
  },
  mutateAndGetPayload: (_params, _context, { rootValue }) => rootValue,
});

const queryType = new GraphQLObjectType({
  name: 'Query',
  fields: () => ({
    query: { type: queryType },
  }),
});

const mutationType = new GraphQLObjectType({
  name: 'Mutation',
  fields: {
    simpleMutation,
    simpleMutationWithDescription,
    simpleMutationWithDeprecationReason,
    simpleMutationWithThunkFields,
    simplePromiseMutation,
    simpleRootValueMutation,
  },
});

const schema = new GraphQLSchema({
  query: queryType,
  mutation: mutationType,
});

describe('mutationWithClientMutationId()', () => {
  it('requires an argument', () => {
    const source = `
      mutation {
        simpleMutation {
          result
        }
      }
    `;

    expect(graphqlSync({ schema, source })).to.deep.equal({
      errors: [
        {
          message:
            'Field "simpleMutation" argument "input" of type "SimpleMutationInput!" is required, but it was not provided.',
          locations: [{ line: 3, column: 9 }],
        },
      ],
    });
  });

  it('returns the same client mutation ID', () => {
    const source = `
      mutation {
        simpleMutation(input: {clientMutationId: "abc"}) {
          result
          clientMutationId
        }
      }
    `;

    expect(graphqlSync({ schema, source })).to.deep.equal({
      data: {
        simpleMutation: {
          result: 1,
          clientMutationId: 'abc',
        },
      },
    });
  });

  it('supports thunks as input and output fields', () => {
    const source = `
      mutation {
        simpleMutationWithThunkFields(input: {
          inputData: 1234,
          clientMutationId: "abc"
        }) {
          result
          clientMutationId
        }
      }
    `;

    expect(graphqlSync({ schema, source })).to.deep.equal({
      data: {
        simpleMutationWithThunkFields: {
          result: 1234,
          clientMutationId: 'abc',
        },
      },
    });
  });

  it('supports promise mutations', async () => {
    const source = `
      mutation {
        simplePromiseMutation(input: {clientMutationId: "abc"}) {
          result
          clientMutationId
        }
      }
    `;

    expect(await graphql({ schema, source })).to.deep.equal({
      data: {
        simplePromiseMutation: {
          result: 1,
          clientMutationId: 'abc',
        },
      },
    });
  });

  it('can access rootValue', () => {
    const source = `
      mutation {
        simpleRootValueMutation(input: {clientMutationId: "abc"}) {
          result
          clientMutationId
        }
      }
    `;
    const rootValue = { result: 1 };

    expect(graphqlSync({ schema, source, rootValue })).to.deep.equal({
      data: {
        simpleRootValueMutation: {
          result: 1,
          clientMutationId: 'abc',
        },
      },
    });
  });

  it('supports mutations returning null', () => {
    const source = `
      mutation {
        simpleRootValueMutation(input: {clientMutationId: "abc"}) {
          result
          clientMutationId
        }
      }
    `;

    expect(graphqlSync({ schema, source })).to.deep.equal({
      data: {
        simpleRootValueMutation: {
          result: null,
          clientMutationId: 'abc',
        },
      },
    });
  });

  describe('introspection', () => {
    it('contains correct input', () => {
      const source = `
        {
          __type(name: "SimpleMutationInput") {
            name
            kind
            inputFields {
              name
              type {
                name
                kind
              }
            }
          }
        }
      `;

      expect(graphqlSync({ schema, source })).to.deep.equal({
        data: {
          __type: {
            name: 'SimpleMutationInput',
            kind: 'INPUT_OBJECT',
            inputFields: [
              {
                name: 'clientMutationId',
                type: {
                  name: 'String',
                  kind: 'SCALAR',
                },
              },
            ],
          },
        },
      });
    });

    it('contains correct payload', () => {
      const source = `
        {
          __type(name: "SimpleMutationPayload") {
            name
            kind
            fields {
              name
              type {
                name
                kind
              }
            }
          }
        }
      `;

      expect(graphqlSync({ schema, source })).to.deep.equal({
        data: {
          __type: {
            name: 'SimpleMutationPayload',
            kind: 'OBJECT',
            fields: [
              {
                name: 'result',
                type: {
                  name: 'Int',
                  kind: 'SCALAR',
                },
              },
              {
                name: 'clientMutationId',
                type: {
                  name: 'String',
                  kind: 'SCALAR',
                },
              },
            ],
          },
        },
      });
    });

    it('contains correct field', () => {
      const source = `
        {
          __schema {
            mutationType {
              fields {
                name
                args {
                  name
                  type {
                    name
                    kind
                    ofType {
                      name
                      kind
                    }
                  }
                }
                type {
                  name
                  kind
                }
              }
            }
          }
        }
      `;

      expect(graphqlSync({ schema, source })).to.deep.equal({
        data: {
          __schema: {
            mutationType: {
              fields: [
                {
                  name: 'simpleMutation',
                  args: [
                    {
                      name: 'input',
                      type: {
                        name: null,
                        kind: 'NON_NULL',
                        ofType: {
                          name: 'SimpleMutationInput',
                          kind: 'INPUT_OBJECT',
                        },
                      },
                    },
                  ],
                  type: {
                    name: 'SimpleMutationPayload',
                    kind: 'OBJECT',
                  },
                },
                {
                  name: 'simpleMutationWithDescription',
                  args: [
                    {
                      name: 'input',
                      type: {
                        name: null,
                        kind: 'NON_NULL',
                        ofType: {
                          name: 'SimpleMutationWithDescriptionInput',
                          kind: 'INPUT_OBJECT',
                        },
                      },
                    },
                  ],
                  type: {
                    name: 'SimpleMutationWithDescriptionPayload',
                    kind: 'OBJECT',
                  },
                },
                {
                  name: 'simpleMutationWithThunkFields',
                  args: [
                    {
                      name: 'input',
                      type: {
                        name: null,
                        kind: 'NON_NULL',
                        ofType: {
                          name: 'SimpleMutationWithThunkFieldsInput',
                          kind: 'INPUT_OBJECT',
                        },
                      },
                    },
                  ],
                  type: {
                    name: 'SimpleMutationWithThunkFieldsPayload',
                    kind: 'OBJECT',
                  },
                },
                {
                  name: 'simplePromiseMutation',
                  args: [
                    {
                      name: 'input',
                      type: {
                        name: null,
                        kind: 'NON_NULL',
                        ofType: {
                          name: 'SimplePromiseMutationInput',
                          kind: 'INPUT_OBJECT',
                        },
                      },
                    },
                  ],
                  type: {
                    name: 'SimplePromiseMutationPayload',
                    kind: 'OBJECT',
                  },
                },
                {
                  name: 'simpleRootValueMutation',
                  args: [
                    {
                      name: 'input',
                      type: {
                        name: null,
                        kind: 'NON_NULL',
                        ofType: {
                          name: 'SimpleRootValueMutationInput',
                          kind: 'INPUT_OBJECT',
                        },
                      },
                    },
                  ],
                  type: {
                    name: 'SimpleRootValueMutationPayload',
                    kind: 'OBJECT',
                  },
                },
              ],
            },
          },
        },
      });
    });

    it('contains correct descriptions', () => {
      const source = `
        {
          __schema {
            mutationType {
              fields {
                name
                description
              }
            }
          }
        }
      `;

      expect(graphqlSync({ schema, source })).to.deep.equal({
        data: {
          __schema: {
            mutationType: {
              fields: [
                {
                  name: 'simpleMutation',
                  description: null,
                },
                {
                  name: 'simpleMutationWithDescription',
                  description: 'Simple Mutation Description',
                },
                {
                  name: 'simpleMutationWithThunkFields',
                  description: null,
                },
                {
                  name: 'simplePromiseMutation',
                  description: null,
                },
                {
                  name: 'simpleRootValueMutation',
                  description: null,
                },
              ],
            },
          },
        },
      });
    });

    it('contains correct deprecation reasons', () => {
      const source = `
        {
          __schema {
            mutationType {
              fields(includeDeprecated: true) {
                name
                isDeprecated
                deprecationReason
              }
            }
          }
        }
      `;

      expect(graphqlSync({ schema, source })).to.deep.equal({
        data: {
          __schema: {
            mutationType: {
              fields: [
                {
                  name: 'simpleMutation',
                  isDeprecated: false,
                  deprecationReason: null,
                },
                {
                  name: 'simpleMutationWithDescription',
                  isDeprecated: false,
                  deprecationReason: null,
                },
                {
                  name: 'simpleMutationWithDeprecationReason',
                  isDeprecated: true,
                  deprecationReason: 'Just because',
                },
                {
                  name: 'simpleMutationWithThunkFields',
                  isDeprecated: false,
                  deprecationReason: null,
                },
                {
                  name: 'simplePromiseMutation',
                  isDeprecated: false,
                  deprecationReason: null,
                },
                {
                  name: 'simpleRootValueMutation',
                  isDeprecated: false,
                  deprecationReason: null,
                },
              ],
            },
          },
        },
      });
    });
  });
});
