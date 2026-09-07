/// <reference types="vite/client" />

declare module '*.css';
declare module '*.json' {
  const value: any;
  export default value;
}
