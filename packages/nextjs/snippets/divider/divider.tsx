// import { IconContext } from "react-icons";
// import { RiSwapFill } from "react-icons/ri";
// const Divider = () => {
//   return (
//     <div className="flex items-center my-2 ">
//       {/* Left */}
//       <div className="flex-grow w-[45%]"></div>
//       {/* Angle Down */}
//       <IconContext.Provider value={{ color: "var(--fallback-p,oklch(var(--p)/var(--tw-text-opacity, 1)))" }}>
//         <div className="btn btn-outline btn-circle btn-ghost ">
//           <RiSwapFill size={25} />
//         </div>
//       </IconContext.Provider>
//       {/* Right */}
//       <div className="flex-grow w-[45%]"></div>
//     </div>
//   );
// };
// export default Divider;
import { FC } from "react";
import { RiSwapFill } from "react-icons/ri";

type DividerProp = {
  onClick: () => void;
};

const Divider: FC<DividerProp> = ({ onClick }) => {
  return (
    <div className="flex items-center my-2">
      {/* Left */}
      <div className="flex-grow w-[45%] border-t  border-gray-300"></div>

      {/* Button with Icon */}
      <button className="btn btn-outline btn-circle btn-ghost text-primary" onClick={() => onClick()}>
        <RiSwapFill size={25} />
      </button>

      {/* Right */}
      <div className="flex-grow w-[45%] border-t border-gray-300"></div>
    </div>
  );
};

export default Divider;
