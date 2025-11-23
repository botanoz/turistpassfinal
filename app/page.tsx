import Hero from "@/components/Hero";
import PopularPasses from "@/components/PopularPasses";
import HowItWorks from "@/components/HowItWorks";
import PopularPlaces from "@/components/PopularPlaces";
import FAQ from "@/components/FAQ";
import WhyIstanbulPass from "@/components/WhyIstanbullPass";

export default function Home() {
  return (
    <>
      <Hero />
      <WhyIstanbulPass />
      <PopularPasses />
      <PopularPlaces />
      <HowItWorks />
      <FAQ />
    </>
  );
}