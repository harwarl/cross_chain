import { FaAngleDown } from "react-icons/fa";

const Divider = () => {
  return (
    <div className="flex items-center my-2 ">
      {/* Left */}
      <div className="flex-grow w-[45%]"></div>
      {/* Angle Down */}
      <FaAngleDown />
      {/* Right */}
      <div className="flex-grow w-[45%]"></div>
    </div>
  );
};

export default Divider;
