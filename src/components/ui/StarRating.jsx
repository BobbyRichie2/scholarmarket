import { Fragment } from "react";
import { FaRegStar, FaStar } from "react-icons/fa";

export default function StarRating({
  value = 0,
  onChange,
  readOnly = false,
  className = "",
  disabled = false,
  size = "md",
}) {
  const sizeClasses = {
    sm: "text-base",
    md: "text-xl",
    lg: "text-2xl",
  };

  return (
    <div className={['flex items-center gap-1', className].join(' ')} role={readOnly ? undefined : 'radiogroup'}>
      {[1, 2, 3, 4, 5].map((star) => {
        const selected = value >= star;
        const iconProps = {
          className: [
            sizeClasses[size] || sizeClasses.md,
            selected ? 'text-amber-500' : 'text-slate-300',
            readOnly ? 'cursor-default' : 'cursor-pointer',
          ].join(' '),
        };

        const starNode = selected ? <FaStar {...iconProps} /> : <FaRegStar {...iconProps} />;

        if (readOnly) {
          return <Fragment key={star}>{starNode}</Fragment>;
        }

        return (
          <button
            key={star}
            type="button"
            disabled={disabled}
            onClick={() => onChange?.(star)}
            className="rounded-full p-1 transition hover:scale-105 focus:outline-none focus:ring-2 focus:ring-amber-200 disabled:cursor-not-allowed disabled:opacity-60"
            role="radio"
            aria-checked={selected}
            aria-label={`${star} star${star === 1 ? "" : "s"}`}
          >
            {starNode}
          </button>
        );
      })}
    </div>
  );
}
