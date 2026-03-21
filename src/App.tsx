import React from 'react';
import { AppWrapper } from '@/components/AppWrapper';
import { AppRouter } from '@/components/AppRouter';
import { ActionViewSwitcher } from '@/components/ActionViewSwitcher';

const App: React.FC = () => {
  return (
    <AppWrapper>
      <AppRouter>
        <ActionViewSwitcher />
      </AppRouter>
    </AppWrapper>
  );
};

export default App;
