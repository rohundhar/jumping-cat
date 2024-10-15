
import { Server, GET, Path} from 'typescript-rest';

@Path('/hello') // Example path
class HelloController {
    @GET
    async sayHello(): Promise<string> {
        return 'Hello from typescript-rest!';
    }
}

const app = express();
Server.buildServices(app, HelloController); // Register the controller

app.listen(3000, () => {
    console.log('Server listening on port 3000');
});