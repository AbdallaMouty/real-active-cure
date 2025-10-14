import Logo from "../assets/images/Logo.png";

const Splash = () => {
  return (
    <div className="flex flex-col items-center justify-center h-screen w-screen">
      <div className="w-full flex-1"></div>
      <img src={Logo} width={"75%"} height={120} />
      <div className="w-full flex-1"></div>
      <div className="w-full flex flex-col items-center justify-center mb-10">
        <span className="text-lg font-light">Powered by</span>
        <h1 className="text-3xl">Dot Design</h1>
      </div>
    </div>
  );
};

export default Splash;
