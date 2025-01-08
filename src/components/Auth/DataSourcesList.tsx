import { DataSourceItem } from './DataSourceItem';

export function DataSourcesList() {
  const dataSources = [
    {
      id: 'google-drive',
      name: 'Google Drive',
      type: 'google',
      accounts: [
        { email: 'an121245@gmail.com', lastSync: '2025-01-02 09:50 AM' },
        { email: '9paiii@gmail.com', lastSync: '2025-01-02 09:50 AM' }
      ]
    },
    {
      id: 'yuque',
      name: 'Yuque',
      type: 'yuque',
      accounts: []
    },
    {
      id: 'github',
      name: 'Github',
      type: 'github',
      accounts: []
    }
  ];

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-medium text-gray-900">Data Source</h2>
      <div className="space-y-4">
        {dataSources.map(source => (
          <DataSourceItem key={source.id} {...source} />
        ))}
      </div>
    </div>
  );
}