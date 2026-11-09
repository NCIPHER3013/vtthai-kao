export type Kind = 'query' | 'mutation' | 'action';
export type Registered = { __fn: true; kind: Kind; internal: boolean; handler: (ctx: any, args: any) => any };

const make = (kind: Kind, internal: boolean) => (def: any): Registered => ({
  __fn: true,
  kind,
  internal,
  handler: typeof def === 'function' ? def : def.handler,
});

export const query = make('query', false);
export const mutation = make('mutation', false);
export const action = make('action', false);
export const internalQuery = make('query', true);
export const internalMutation = make('mutation', true);
export const internalAction = make('action', true);
