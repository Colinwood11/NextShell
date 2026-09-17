import { Dropdown } from "antd";
import type { MenuProps } from "antd";

export interface PointerMenuItem {
  key: string;
  label: string;
  icon?: string;
  danger?: boolean;
  disabled?: boolean;
  onSelect: () => void;
}

interface PointerMenuProps {
  x: number;
  y: number;
  items: PointerMenuItem[];
  onClose: () => void;
}

/**
 * 在指针位置打开的 antd Dropdown 菜单。表格行与目录树的右键菜单共用它——
 * 边缘避让、外点关闭、键盘导航都交给 antd,不再手写 fixed 定位的菜单。
 */
export const PointerMenu = ({ x, y, items, onClose }: PointerMenuProps) => {
  const menu: MenuProps = {
    items: items.map((item) => ({
      key: item.key,
      label: item.label,
      icon: item.icon ? <i className={item.icon} aria-hidden="true" /> : undefined,
      danger: item.danger,
      disabled: item.disabled
    })),
    onClick: ({ key }) => {
      onClose();
      items.find((item) => item.key === key)?.onSelect();
    },
    onKeyDown: (event) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
      }
    }
  };

  return (
    <Dropdown
      open
      menu={menu}
      trigger={["click"]}
      autoFocus
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
      placement="bottomLeft"
    >
      <span
        // rc-trigger skips alignment for an invisible (zero-sized, fixed) target.
        style={{ position: "fixed", left: x, top: y, width: 1, height: 1, pointerEvents: "none" }}
      />
    </Dropdown>
  );
};
