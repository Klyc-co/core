// AppHeader is now replaced by LeftNavSidebar in the new layout.
// This component is kept as a thin wrapper that renders nothing,
// so existing page imports don't break.

interface AppHeaderProps {
  user?: any;
  businessName?: string;
  unreadMessages?: number;
  onAddClient?: () => void;
}

const AppHeader = (_props: AppHeaderProps) => {
  return null;
};

export default AppHeader;
