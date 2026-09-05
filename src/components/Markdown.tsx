"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import remarkCallouts from "@/lib/remark-callouts";

export function Markdown({ children, className = "" }: { children: string; className?: string }) {
  return (
    <div className={`prose-wiki ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkCallouts]}
        rehypePlugins={[rehypeSlug]}
        components={{
          a: ({ href, children: c }) => (
            <a href={href} target={href?.startsWith("http") ? "_blank" : undefined} rel="noreferrer">
              {c}
            </a>
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
