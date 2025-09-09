import React from 'react';

const ListDesktop = () => {
  const helloWorlds = [];
  for (let i = 0; i < 10; i++) {
    helloWorlds.push(<div key={i}>hello world</div>);
  }

  return (
    <div>
      {helloWorlds}
    </div>
  );
};

export default ListDesktop;
