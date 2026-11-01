import { cn } from 'cn';
import type {
  CategoryIcon as CategoryIconType,
  CategoryIconStyle,
  IconKey,
} from '@smartapp/core/icons';
import { iconPath } from '@smartapp/core/icons';

export interface CategoryIconProps {
  icon: CategoryIconType | IconKey;
  style?: CategoryIconStyle | undefined;
  size?: number | undefined;
  alt?: string | undefined;
  className?: string | undefined;
  textClassName?: string | undefined;
  loading?: 'lazy' | 'eager' | undefined;
  assetOrigin?: string | undefined;
}

/**
 * Renders a category icon as native emoji text or as an <img> tag for Fluent/custom icons.
 */
export function CategoryIcon({
  icon,
  style,
  size = 32,
  alt = '',
  className,
  textClassName,
  loading = 'lazy',
  assetOrigin = '',
}: CategoryIconProps) {
  if (typeof icon === 'object' && icon.kind === 'emoji') {
    return (
      <span
        aria-hidden="true"
        className={cn(
          'text-2xl leading-none font-semibold tracking-wide select-none',
          textClassName,
        )}
      >
        {icon.char}
      </span>
    );
  }

  const src = `${assetOrigin ? assetOrigin.replace(/\/+$/, '') : ''}${iconPath(icon, style)}`;
  return (
    <img
      src={src}
      alt={alt}
      aria-hidden={alt ? undefined : 'true'}
      width={size}
      height={size}
      loading={loading}
      decoding="async"
      className={cn('size-8 object-contain', className)}
    />
  );
}
