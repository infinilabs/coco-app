import { Link2, Trash2 } from "lucide-react";

interface Account {
  email: string;
  lastSync: string;
}

interface DataSourceItemProps {
  name: string;
  type: string;
  accounts: Account[];
}

export function DataSourceItem({ name, type, accounts }: DataSourceItemProps) {
  const isConnected = accounts.length > 0;

  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <img src={`/icons/${type}.svg`} alt={name} className="w-6 h-6" />
          <span className="font-medium">{name}</span>
        </div>
        <button className="text-blue-500 hover:text-blue-600 flex items-center space-x-1">
          <Link2 className="w-4 h-4" />
        </button>
      </div>
      <div className="text-sm text-gray-500 mb-2">
        {isConnected ? "Manage" : "Connect Accounts"}
      </div>

      {accounts.map((account, index) => (
        <div
          key={account.email}
          className="flex items-center justify-between py-2 border-t border-gray-100"
        >
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
              <span className="text-sm text-gray-500">
                {account.email[0].toUpperCase()}
              </span>
            </div>
            <div>
              <div className="text-sm font-medium">
                {index === 0 ? "My network disk" : `Network disk ${index + 1}`}
              </div>
              <div className="text-xs text-gray-500">{account.email}</div>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-xs text-gray-500">
            Recently Synced: {account.lastSync}
            </span>
            <button className="text-gray-400 hover:text-gray-600">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
