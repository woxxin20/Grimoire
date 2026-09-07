import { MindProvider } from './context/MindContext';
import { GrimoireApp } from './components/grimoire/GrimoireApp';

export default function App() {
  return <MindProvider><GrimoireApp /></MindProvider>;
}
