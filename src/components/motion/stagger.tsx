"use client";

import { type HTMLMotionProps, motion, type Variants } from "motion/react";
import { STAGGER } from "./spring";

const group: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: STAGGER } },
};

const child: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0 },
};

type Tag = "div" | "ul" | "ol" | "section";
type ItemTag = "div" | "li" | "section" | "article";

type StaggerProps<T extends Tag> = { as?: T } & HTMLMotionProps<T>;

/** Container whose <StaggerItem> children enter one after another (0.04 s apart). */
export function Stagger<T extends Tag = "div">({ as, ...props }: StaggerProps<T>) {
  const Component = motion[(as ?? "div") as Tag] as React.ComponentType<HTMLMotionProps<Tag>>;
  return <Component variants={group} initial="hidden" animate="visible" {...(props as HTMLMotionProps<Tag>)} />;
}

type StaggerItemProps<T extends ItemTag> = {
  as?: T;
  /** Already on screen (e.g. added later to a long list): appear without the entrance. */
  immediate?: boolean;
} & HTMLMotionProps<T>;

export function StaggerItem<T extends ItemTag = "div">({ as, immediate = false, ...props }: StaggerItemProps<T>) {
  const Component = motion[(as ?? "div") as ItemTag] as React.ComponentType<HTMLMotionProps<ItemTag>>;
  return (
    <Component
      variants={child}
      {...(immediate ? { initial: false } : {})}
      {...(props as HTMLMotionProps<ItemTag>)}
    />
  );
}
