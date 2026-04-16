declare module 'lodash.debounce' {
  type Procedure = (...args: any[]) => any;

  interface DebouncedFunc<T extends Procedure> {
    (this: ThisParameterType<T>, ...args: Parameters<T>): ReturnType<T>;
    cancel(): void;
    flush(): void;
  }

  function debounce<T extends Procedure>(func: T, wait?: number, options?: { leading?: boolean; trailing?: boolean; maxWait?: number }): DebouncedFunc<T>;

  export default debounce;
}
