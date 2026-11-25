declare module '*.dc.html?dc-logic' {
  import type { DCLogic } from './lib/dc/runtime';
  const Component: new (props: object) => DCLogic;
  export default Component;
}
