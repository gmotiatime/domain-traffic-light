declare module "react-markdown" {
  import { FC, ReactNode } from "react";

  interface ReactMarkdownProps {
    children: string;
    components?: Record<string, FC<any>>;
    className?: string;
  }

  const ReactMarkdown: FC<ReactMarkdownProps>;
  export default ReactMarkdown;
}
