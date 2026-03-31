import { Capacitor } from "@capacitor/core";

import Navbar from "@/components/Navbar";
import HomeScreen from "@/components/app/HomeScreen";
import PremiumHomePage from "@/components/app/PremiumHomePage";

const Index = () => {
  const isNativeApp = Capacitor.isNativePlatform();

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      {isNativeApp ? <HomeScreen /> : <PremiumHomePage />}
    </div>
  );
};

export default Index;
