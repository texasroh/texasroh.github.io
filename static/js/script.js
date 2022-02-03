'use strict';


// Ajax method to load same ul-li list from other html file
document.querySelectorAll("*[data-include-path]").forEach((element) => {
	var includePath = element.dataset.includePath;
	var xhttp = new XMLHttpRequest();
	xhttp.onreadystatechange = function() {
		if (this.readyState == 4 && this.status == 200){
			element.outerHTML = this.responseText;
		}
	};
	xhttp.open('GET', includePath, true);
	xhttp.send();	
});

// sidebar for mobile
function showSideMenu(){
	document.querySelector('.side-menu-background').style.display = 'block';
	document.querySelector('.side-menu').style.right='0';
}

function hideSideMenu(){
	document.querySelector('.side-menu').style.right='-100vw';
	document.querySelector('.side-menu-background').style.display = 'none';
}

document.querySelector('.side-menu-open').addEventListener('click', () => {
	showSideMenu();
});

document.querySelector('.side-menu-background').addEventListener('click', () => {
	hideSideMenu();
});

document.querySelector('.side-menu-close').addEventListener('click', () => {
	hideSideMenu();
});


// for sticky top header
var header = document.querySelector('header');
var headerHeight = header.getBoundingClientRect().height;
document.addEventListener('scroll', () => {
	if (window.scrollY > headerHeight){
		header.classList.add('header--dark');
	} else {
		header.classList.remove('header--dark');
	}
});



// for menu item click
document.querySelectorAll('header *[data-link]').forEach((element) => {
	let link = element.dataset.link
	element.addEventListener('click', () => {
		document.querySelector(link).scrollIntoView();
	})
})