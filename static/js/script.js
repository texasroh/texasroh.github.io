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