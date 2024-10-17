import * as path from 'path';
import express from 'express';


const dirName = `/Users/rohundhar/Desktop/Projects/jumping-cat`;
const port = 8080;
const app = express();

app.get('/auth', (req: any, res: any) => {
  const code = req.query.code;
  // Handle the authorization code here
  res.send('Authorization code received!');
});

console.log(path.join(dirName, 'Assets'));
// // Serve static files from the 'Assets' directory
app.use('/Assets', express.static(path.join(dirName, 'Assets')));

app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
});