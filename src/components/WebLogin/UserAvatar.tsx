import clsx from "clsx";
import { LucideProps, User } from "lucide-react";
import { FC, HTMLAttributes } from "react";

interface UserAvatarProps extends HTMLAttributes<HTMLDivElement> {
  icon?: LucideProps;
}

const UserAvatar: FC<UserAvatarProps> = (props) => {
  const { className, icon } = props;

  return (
    <div
      className={clsx(
        "flex items-center justify-center size-5 rounded-full border border-border overflow-hidden",
        className
      )}
    >
      <User {...icon} className={clsx("size-4", icon?.className)}></User>
    </div>
  );
};

export default UserAvatar;
