import React from "react";
import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <>
      <div className="footer bg-dark text-light p-3">
       
        <p className="text-center mt-3">
         
          <Link to="/contact-us">Contact</Link>|
          <Link to="/privacy-policy">Privacy Policy</Link>
        </p>
      </div>
    </>
  );
};

export default Footer;
