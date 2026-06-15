// Allows TypeScript to accept `import sql from '*.sql'`.
// Metro inlines the file content as a string at bundle time.
declare module '*.sql' {
  const content: string;
  export default content;
}
