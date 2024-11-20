import { Link, useLocation, useNavigate } from "react-router-dom";

export default function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const showBack = location.pathname !== "/ui";

  return (
    <div>
      <div onClick={() => navigate("/ui")}>Home</div>
      <div>
        <Link to="/ui/settings" title="more">
          Settings
        </Link>
      </div>
    </div>
  );
}
