import type {
  GraphQLFieldConfig,
  GraphQLResolveInfo,
  GraphQLTypeResolver,
} from 'graphql';

export interface GraphQLNodeDefinitions {
  nodeInterface: GraphQLInterfaceType;
  nodeField: GraphQLFieldConfig<any, any>;
  nodesField: GraphQLFieldConfig<any, any>;
}

/**
 * Given a function to map from an ID to an underlying object, and a function
 * to map from an underlying object to the concrete GraphQLObjectType it
 * corresponds to, constructs a `Node` interface that objects can implement,
 * and a field config for a `node` root field.
 *
 * If the typeResolver is omitted, object resolution on the interface will be
 * handled with the `isTypeOf` method on object types, as with any GraphQL
 * interface without a provided `resolveType` method.
 */
export function nodeDefinitions<TContext>(
  idFetcher: (id: string, context: TContext, info: GraphQLResolveInfo) => any,
  typeResolver?: GraphQLTypeResolver<any, TContext>,
): GraphQLNodeDefinitions;

export interface ResolvedGlobalId {
  type: string;
  id: string;
}

/**
 * Takes a type name and an ID specific to that type name, and returns a
 * "global ID" that is unique among all types.
 */
export function toGlobalId(type: string, id: string): string;

/**
 * Takes the "global ID" created by toGlobalID, and returns the type name and ID
 * used to create it.
 */
export function fromGlobalId(globalId: string): ResolvedGlobalId;

/**
 * Creates the configuration for an id field on a node, using `toGlobalId` to
 * construct the ID from the provided typename. The type-specific ID is fetched
 * by calling idFetcher on the object, or if not provided, by accessing the `id`
 * property on the object.
 */
export function globalIdField(
  typeName?: string,
  idFetcher?: (object: any, context: any, info: GraphQLResolveInfo) => string,
): GraphQLFieldConfig<any, any>;