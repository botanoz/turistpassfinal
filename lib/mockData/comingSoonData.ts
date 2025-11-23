export interface FloatingDevice {
    left: string;
    top: string;
    width: string;
    height: string;
    rotation: string;
    delay: string;
  }
  
  export interface ComingSoonContent {
    title: {
      main: string;
      highlight: string;
    };
    description: string;
    storeButtons: {
      apple: {
        icon: string;
        label: string;
      };
      google: {
        icon: string;
        label: string;
      };
    };
    floatingDevices: FloatingDevice[];
  }
  
  export const comingSoonData: ComingSoonContent = {
    title: {
      main: "Mobile App",
      highlight: "Coming Soon"
    },
    description: "Our mobile app will be with you very soon for easier use. Access all features with a single touch.",
    storeButtons: {
      apple: {
        icon: "Apple",
        label: "App Store"
      },
      google: {
        icon: "PlayCircle", 
        label: "Play Store"
      }
    },
    floatingDevices: [
      { 
        left: "25%", 
        top: "30%", 
        width: "70px", 
        height: "70px", 
        rotation: "10deg", 
        delay: "0s" 
      },
      { 
        left: "75%", 
        top: "65%", 
        width: "60px", 
        height: "60px", 
        rotation: "-15deg", 
        delay: "2s" 
      },
      { 
        left: "40%", 
        top: "80%", 
        width: "80px", 
        height: "80px", 
        rotation: "5deg", 
        delay: "4s" 
      }
    ]
  };