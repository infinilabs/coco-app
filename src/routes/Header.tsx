import { Link, useNavigate } from "react-router-dom";

export default function Header() {
  const navigate = useNavigate();

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
