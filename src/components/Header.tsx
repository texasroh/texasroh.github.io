const Header = () => {
    return (
        <div className="fixed top-0 z-10 flex h-16 w-full items-center justify-center bg-red-200">
            <div className="container mx-4 flex items-center justify-between">
                <div>June</div>
                <div className="hidden text-4xl md:block">hello</div>
                <div className="md:hidden"></div>
            </div>
        </div>
    );
};

export default Header;
