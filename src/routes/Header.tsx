import { Link, useLocation, useNavigate } from "react-router-dom";

export default function Header() {
  // 调用 navigate() 去你想去的地方 ⛱️
  const navigate = useNavigate();
  // 我在哪？
  const location = useLocation();
  const showBack = location.pathname !== "/";

  return (
    <div>
      <div onClick={() => navigate("/")}>Home</div>
      <div>
        {/* 相当于 HTML 中的 <a>，点击后跳转页面 */}
        <Link to="/settings" title="更多">
          Settings
        </Link>
      </div>
    </div>
  );
}
