"use client";

import { ListBox, Select } from "@/components/ui/heroui-compat";
import type { Role } from "@/lib/queries/users";

export const ROLE_LABEL: Record<Role, string> = {
  user: "用户",
  editor: "管理员",
  admin: "超级管理员",
};

export const ROLE_COLOR: Record<Role, "primary" | "secondary" | "soft"> = {
  admin: "primary",
  editor: "secondary",
  user: "soft",
};

const ROLE_OPTIONS: readonly { value: Role; label: string }[] = [
  { value: "user", label: "用户" },
  { value: "editor", label: "管理员" },
  { value: "admin", label: "超级管理员" },
];

type Props = {
  disabled: boolean;
  onChange: (role: Role) => void;
  value: Role;
};

export function UserRoleSelector({ disabled, onChange, value }: Props) {
  return (
    <Select
      aria-label="角色"
      className="w-full md:w-48"
      selectedKey={value}
      isDisabled={disabled}
      onSelectionChange={(key) => {
        const next = String(key) as Role;
        if (next !== value) onChange(next);
      }}
    >
      <Select.Trigger className="field-trigger h-9 min-h-9">
        <Select.Value />
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover className="motion-popover popover-surface w-[var(--choice-trigger-width)] p-1">
        <ListBox>
          {ROLE_OPTIONS.map((option) => (
            <ListBox.Item
              key={option.value}
              id={option.value}
              textValue={option.label}
              className="listbox-option"
            >
              {option.label}
            </ListBox.Item>
          ))}
        </ListBox>
      </Select.Popover>
    </Select>
  );
}
