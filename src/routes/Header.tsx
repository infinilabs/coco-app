import { Link, useLocation, useNavigate } from "react-router-dom";

export default function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const showBack = location.pathname !== "/";

  return (
    <div>
      <div onClick={() => navigate("/")}>Home</div>
      <div>
        <Link to="/settings" title="more">
          Settings
        </Link>
      </div>
    </div>
  );
}
