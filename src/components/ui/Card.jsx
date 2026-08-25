export default function Card({
  children,
  className = "",
  as: Component = "div",
  ...props
}) {
  return (
    <Component
      {...props}
      className={[
        "rounded-2xl border border-slate-200 bg-white shadow-sm",
        className,
      ].join(" ")}
    >
      {children}
    </Component>
  );
}
