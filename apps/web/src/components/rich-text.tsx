import { isLink } from "@defensownik/shared/presentation/index";
import type {
  DetailValue,
  RichText,
} from "@defensownik/shared/presentation/index";

function ExternalLink({ href, text }: { href: string; text: string }) {
  const external = href.startsWith("http");
  return (
    <a
      href={href}
      className="underline"
      {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
    >
      {text}
    </a>
  );
}

export function DetailValueView({ value }: { value: DetailValue }) {
  if (value === null) {
    return <span className="text-muted-foreground italic">brak danych</span>;
  }
  if (isLink(value)) {
    return <ExternalLink href={value.href} text={value.text} />;
  }
  return <>{value}</>;
}

export function RichTextView({ text }: { text: RichText }) {
  return (
    <>
      {text.map((part, index) =>
        isLink(part) ? (
          <ExternalLink key={index} href={part.href} text={part.text} />
        ) : (
          <span key={index}>{part}</span>
        ),
      )}
    </>
  );
}
