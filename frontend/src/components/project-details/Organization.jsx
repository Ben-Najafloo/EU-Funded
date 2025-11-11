import React, { useState, useMemo } from 'react'

import { getName, getCode } from 'country-list';
import ReactCountryFlag from "react-country-flag";
import { motion } from 'framer-motion';

import { FaPercent, FaAdn, FaLinkedin, FaPhoneAlt, FaBarcode } from "react-icons/fa";
import { BsCaretDownFill } from "react-icons/bs";
import { MdLocationPin, MdEmail, MdPerson } from "react-icons/md";
import { TbWorldWww } from "react-icons/tb";
import { RiAdminFill } from "react-icons/ri";
import ContactsSpeedDial from './ContactsSpeedDial';

import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import { useTheme } from '../../contexts/ThemeContext';

const Organization = ({ organizations, title, icon: Icon }) => {

  const [order, setOrder] = useState("organizationName");
  const { isDark } = useTheme();

  // Track expanded state for each organization individually
  const [expandedOrgIds, setExpandedOrgIds] = useState(new Set());

  const toggleDetails = (orgId) => {
    setExpandedOrgIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(orgId)) {
        newSet.delete(orgId);
      } else {
        newSet.add(orgId);
      }
      return newSet;
    });
  };

  const isOrgExpanded = (orgId) => expandedOrgIds.has(orgId);

  // Sort organizations based on selected order
  const sortedOrganizations = useMemo(() => {
    const sorted = [...organizations].sort((a, b) => {
      switch (order) {
        case "organizationName":
          return (a.name || '').localeCompare(b.name || '');

        case "projectNumber":
          return (b.project_count || 0) - (a.project_count || 0);

        case "coordinatedNumber":
          return (b.coordinator_count || 0) - (a.coordinator_count || 0);

        case "netEU":
          const aNet = parseFloat((a.netEcContribution || '0').toString().replace(/[^0-9.-]/g, '')) || 0;
          const bNet = parseFloat((b.netEcContribution || '0').toString().replace(/[^0-9.-]/g, '')) || 0;
          return bNet - aNet;

        case "total":
          const aTotal = parseFloat((a.ecContribution || '0').toString().replace(/[^0-9.-]/g, '')) || 0;
          const bTotal = parseFloat((b.ecContribution || '0').toString().replace(/[^0-9.-]/g, '')) || 0;
          return bTotal - aTotal;

        default:
          return 0;
      }
    });
    return sorted;
  }, [organizations, order]);

  const InfoBox = ({ lable, value, icon: Icon }) => {
    return (
      <div className='flex border-b-2 border-white py-2 my-3'>
        <label className="flex text-sm text-gray-900 dark:text-gray-300 w-28">
          {Icon && <Icon className='mr-2 mt-1' />}
          {lable}:
        </label>
        <div className="block text-sm font-medium text-gray-900 dark:text-gray-300">
          {value}
        </div>
      </div>
    );
  };

  return (
    <div className="pb-2 mb-3 mt-20">
      <div className="flex text-lg text-gray-700 dark:text-gray-200">
        {Icon && <Icon className='mt-1 mr-3' />}
        <h3>{title}:</h3>
      </div>

      <Paper sx={{ width: '100%', overflow: 'hidden', borderTop: isDark ? '2px solid white' : '2px solid black' }}>
        <TableContainer sx={{ maxHeight: 485 }}>
          <Table stickyHeader aria-label="sticky table">
            <TableHead>
              <TableRow>
                <TableCell sx={{ backgroundColor: isDark ? '#030712' : 'white' }}>
                  <button
                    onClick={() => setOrder("organizationName")}
                    className={`text-gray-800 dark:text-gray-200 font-bold cursor-pointer hover:text-blue-500 ${order === "organizationName" ? "text-blue-600" : ""}`}
                  >
                    Organization
                  </button>
                </TableCell>
                <TableCell sx={{ backgroundColor: isDark ? '#030712' : 'white' }}>
                  <button
                    onClick={() => setOrder("projectNumber")}
                    className={`text-gray-800 dark:text-gray-200 font-bold cursor-pointer hover:text-blue-500 ${order === "projectNumber" ? "text-blue-600" : ""}`}
                  >
                    Projects No
                  </button>
                </TableCell>
                <TableCell sx={{ backgroundColor: isDark ? '#030712' : 'white' }}>
                  <button
                    onClick={() => setOrder("coordinatedNumber")}
                    className={`text-gray-800 dark:text-gray-200 font-bold cursor-pointer hover:text-blue-500 ${order === "coordinatedNumber" ? "text-blue-600" : ""}`}
                  >
                    Coordinated No
                  </button>
                </TableCell>
                <TableCell sx={{ backgroundColor: isDark ? '#030712' : 'white' }}>
                  <button
                    onClick={() => setOrder("netEU")}
                    className={`text-gray-800 dark:text-gray-200 font-bold cursor-pointer hover:text-blue-500 ${order === "netEU" ? "text-blue-600" : ""}`}
                  >
                    Net EU Contribution
                  </button>
                </TableCell>
                <TableCell sx={{ backgroundColor: isDark ? '#030712' : 'white' }}>
                  <button
                    onClick={() => setOrder("total")}
                    className={`text-gray-800 dark:text-gray-200 font-bold cursor-pointer hover:text-blue-500 ${order === "total" ? "text-blue-600" : ""}`}
                  >
                    Total Contributions
                  </button>
                </TableCell>
                <TableCell sx={{ backgroundColor: isDark ? '#030712' : 'white' }}>
                  <button className='font-bold text-gray-800 dark:text-gray-200'>Extend</button>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sortedOrganizations.map((organization, index) => {
                const isExpanded = isOrgExpanded(organization._id || index);

                return (
                  <React.Fragment key={organization._id || index}>
                    <TableRow hover>
                      <TableCell className='bg-white dark:bg-gray-900'>
                        <div className="text-sm font-semibold">
                          <span className='text-gray-800 dark:text-gray-200'>{organization ? organization.name.slice(0, 55) : 'Not Defined'}</span>
                          {organization.SME === "true" && <span className='bg-green-500 text-white ml-3 rounded-full text-xs py-2'>SME</span>}
                        </div>
                        <div className="mt-1 flex">
                          {organization ? (
                            <ReactCountryFlag
                              countryCode={getCode(organization.country) || organization.country}
                              svg
                              style={{ width: '1.5em', height: '1.5em', }}
                              title={getName(organization.country) || organization.country}
                            />
                          ) : (
                            <p className="text-xs">Coordinator Country: {organization ? getName(organization.country) || organization.country : 'Not Defined'}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell align="center" className='bg-white dark:bg-gray-900'>
                        <span className='text-gray-800 dark:text-gray-200'>{organization.project_count}</span>
                      </TableCell>
                      <TableCell align="center" className='bg-white dark:bg-gray-900'>
                        <span className='text-gray-800 dark:text-gray-200'>{organization.coordinator_count}</span>
                      </TableCell>
                      <TableCell align="center" className='bg-white dark:bg-gray-900'>
                        <span className='text-gray-800 dark:text-gray-200'>{organization.netEcContribution}</span>
                      </TableCell>
                      <TableCell align="center" className='bg-white dark:bg-gray-900'>
                        <span className='text-gray-800 dark:text-gray-200'>{organization.ecContribution}</span>
                      </TableCell>
                      <TableCell align="center" className='bg-white dark:bg-gray-900'>
                        <button
                          onClick={() => toggleDetails(organization._id || index)}
                          className="hover:font-bold px-5 inline-flex items-center cursor-pointer"
                        >
                          <motion.span animate={{ rotate: isExpanded ? 180 : 0 }} className='text-gray-800 dark:text-gray-200'>
                            <BsCaretDownFill className="ml-3" />
                          </motion.span>
                        </button>
                      </TableCell>
                    </TableRow>

                    {/* show details of organization - spans all columns */}
                    {isExpanded && organization && (
                      <TableRow className='bg-gray-200 dark:bg-gray-900'>
                        <TableCell colSpan={5} style={{ padding: 0, borderBottom: 'none' }}>
                          <motion.div
                            className='flex w-full  p-3'
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            transition={{ duration: 0.3 }}
                          >
                            <div className="lg:flex mt-1 mx-2 w-full ">
                              <div className='lg:w-3/5'>
                                <InfoBox lable="Role" icon={RiAdminFill} value={organization.role} />
                                <InfoBox lable="Address" icon={MdLocationPin} value={organization.street.slice(0, 25) + ", " + organization.postCode + ", " + organization.city} />
                                <InfoBox lable="Website" icon={TbWorldWww} value={organization.organizationURL} />
                                <InfoBox lable="Short Name" icon={FaAdn} value={organization.shortName} />
                                <InfoBox lable="LinkedIn" icon={FaLinkedin} />
                              </div>
                              <div className='lg:w-2/5'>
                                <InfoBox lable="NUTS Code" icon={FaBarcode} value={organization.nutsCode} />
                                <InfoBox lable="Vat Number" icon={FaPercent} value={organization.vatNumber} />
                                <InfoBox lable="Answerable" icon={MdPerson} />
                                <InfoBox lable="Phone" icon={FaPhoneAlt} />
                                <InfoBox lable="Email" icon={MdEmail} />
                              </div>
                            </div>

                          </motion.div>
                        </TableCell>
                        <TableCell>
                          <ContactsSpeedDial className="w-1/12" />
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </div >
  );
}

export default Organization;