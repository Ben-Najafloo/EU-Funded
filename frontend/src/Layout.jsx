import { Outlet } from 'react-router-dom';
import Nav from './components/Nav';
import Footer from './components/Footer';



const Layout = () => {


    return (

        <div className='dark:bg-black'>
            <Nav />
            <div className='lg:w-9/12 w-full m-auto dark:bg-black'>
                <Outlet />
            </div>
            <Footer />
        </div>

    )
}

export default Layout;