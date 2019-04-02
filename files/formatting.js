window.onscroll = function() {toggleNavBar()};

function toggleNavBar() {
    var navbar = document.getElementById("navbar_lrg");
    if (document.body.scrollTop > 100 || document.documentElement.scrollTop > 100) {
        navbar.className = "w3-bar" + " w3-card" + " w3-animate-top" + " w3-white";
    } else {
        navbar.className = navbar.className.replace(" w3-card w3-animate-top w3-white", "");
    }
}
// Used to toggle the menu on small screens when clicking on the menu button
function toggleSmallScreenNavBar() {
    var x = document.getElementById("navbar_sml");
    if (x.className.indexOf("w3-show") == -1) {
        x.className += " w3-show";
    } else {
        x.className = x.className.replace(" w3-show", "");
    }
}

//Used to display accordion blocks
function hideSmall(id) {
    var x = document.getElementById("detailed_"+id);
    if (x.className.indexOf("w3-hide-small") == -1) {
      x.className += " w3-hide-small";
    } else { 
      x.className = x.className.replace(" w3-hide-small", "");
    }
}

//Used to display accordion blocks
function accordionFunction(id) {
    var x = document.getElementById(id);
    if (x.className.indexOf("w3-hide") == -1) {
      x.className += " w3-hide";
    } else { 
      x.className = x.className.replace(" w3-hide", "");
    }
}