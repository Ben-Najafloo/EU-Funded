import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { ClerkProvider } from '@clerk/clerk-react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { SearchProvider } from './contexts/SearchContext';
import Layout from './Layout';
import Home from "./pages/Home";
import AllProjectsPaginated from './pages/AllProjectsPaginated';
import ProjectDetails from './pages/ProjectDetails';
import Test from './pages/Test';
import RecentProjects from './pages/RecentProjects';
import ExpiringProjects from './pages/ExpiringProjects';
import ClosedProjects from './pages/ClosedProjects';
import SignInPage from './pages/SignIn';
import FavoriteProjects from './components/FavoriteProjects';
import HistoryPage from './components/user/History';
import Stats from './components/stats/Stats';
import OrganizationDetails from './pages/OrganizationDetails';
import RecomProjects from './pages/RecomProjects';
import Desktop from './pages/Desktop';

import { SignedIn, SignedOut, RedirectToSignIn } from "@clerk/clerk-react";
import Docs from './pages/Docs';

const queryClient = new QueryClient()

// Clerk publishable key
const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

if (!PUBLISHABLE_KEY) {
  throw new Error('Missing Clerk publishable key in .env')
}

const Protected = ({ children }) => {
  return (
    <>
      <SignedIn>{children}</SignedIn>
      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>
    </>
  );
};

function App() {
  return (
    <QueryClientProvider client={queryClient} >
      <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
        <SearchProvider>
          <Router>
            <Routes>
              <Route path="/" element={<Layout />}>
                <Route index element={<Home />} />
                <Route
                  path="desktop"
                  element={<Protected><Desktop /></Protected>}
                />
                <Route
                  path="history-projects"
                  element={<Protected><HistoryPage /></Protected>}
                />
                <Route
                  path="favorite-projects"
                  element={<Protected><FavoriteProjects /></Protected>}
                />
                <Route path="all-projects" element={<AllProjectsPaginated />} />
                <Route path="project/:id" element={<ProjectDetails />} />
                <Route path="org/:id" element={<OrganizationDetails />} />
                <Route path="test" element={<Test />} />
                <Route path="docs" element={<Docs />} />
                <Route path="recent" element={<RecentProjects />} />
                <Route path="stats" element={<Stats />} />
                <Route path="expiring" element={<ExpiringProjects />} />
                <Route path="recom-projects" element={<RecomProjects />} />
                <Route path="closed" element={<ClosedProjects />} />
                <Route path="favorite-projects" element={<FavoriteProjects />} />
                <Route path="history-projects" element={<HistoryPage />} />
                <Route path="sign-in" element={<SignInPage />} />
              </Route>
            </Routes>
          </Router>
        </SearchProvider>
      </ClerkProvider>
    </QueryClientProvider>
  )
}

export default App
