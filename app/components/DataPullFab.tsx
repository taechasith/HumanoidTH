"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Fab from "@mui/material/Fab";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import { DatabaseZap } from "lucide-react";
import { runDataPull } from "@/app/actions";

function PullDialogSubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" variant="contained" disabled={pending} aria-busy={pending}>
      {pending ? (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <CircularProgress aria-label="Loading..." color="inherit" size={18} />
          <span>Pulling...</span>
        </Box>
      ) : (
        "Run pull"
      )}
    </Button>
  );
}

export default function DataPullFab() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  async function handlePull(formData: FormData) {
    await runDataPull(formData);
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <Tooltip title="Run data pull" placement="left">
        <Fab
          className="data-pull-fab"
          color="primary"
          aria-label="Run data pull"
          onClick={() => setOpen(true)}
        >
          <DatabaseZap size={22} aria-hidden="true" />
        </Fab>
      </Tooltip>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="xs">
        <form action={handlePull}>
          <DialogTitle>Run data pull</DialogTitle>
          <DialogContent sx={{ display: "grid", gap: 2, pt: 1 }}>
            <FormControl fullWidth margin="dense">
              <InputLabel id="data-pull-adapter-label">Adapter</InputLabel>
              <Select
                labelId="data-pull-adapter-label"
                name="adapter"
                label="Adapter"
                defaultValue="OPENALEX"
              >
                <MenuItem value="OPENALEX">OpenAlex</MenuItem>
                <MenuItem value="GITHUB">GitHub</MenuItem>
                <MenuItem value="GDELT">GDELT</MenuItem>
                <MenuItem value="YOUTUBE">YouTube</MenuItem>
              </Select>
            </FormControl>
            <TextField
              name="query"
              label="Query"
              defaultValue="humanoid robot Thailand"
              required
              fullWidth
            />
            <TextField
              name="limit"
              label="Limit"
              type="number"
              defaultValue="10"
              fullWidth
              slotProps={{ htmlInput: { min: 1, max: 50 } }}
            />
          </DialogContent>
          <DialogActions>
            <Button type="button" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <PullDialogSubmitButton />
          </DialogActions>
        </form>
      </Dialog>
    </>
  );
}
