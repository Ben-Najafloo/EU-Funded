import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import CheckIcon from '@mui/icons-material/Check';

export default function AlertComp({ alertInfo, setAlertInfo }) {
  const handleClose = () => {
    setAlertInfo(prev => ({ ...prev, open: false }));
  };

  return (
    <Snackbar
      open={alertInfo.open}
      autoHideDuration={4000}
      onClose={handleClose}
      anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
    >
      <Alert
        icon={<CheckIcon fontSize="inherit" />}
        severity={alertInfo.severity}
        onClose={handleClose}
        sx={{ width: '100%' }}
      >
        {alertInfo.message}
      </Alert>
    </Snackbar>
  );
}
