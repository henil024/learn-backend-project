import {asyncHandler} from '../utils/asyncHandler.js'
import {ApiError} from "../utils/ApiErros.js"
import { User} from "../models/user.models.js"
import { uploadCloudinary } from '../utils/cloudinary.js'
import { ApiResponse } from '../utils/ApiResponse.js'

const generateAccessAndRefereshToken = async(userId)=>{
    try {
        const user = await User.findById(userId)
        const accesToken = user.generateAccessToken()
        const refereshToken = user.generateRefreshToken()

        user.refreshToken = refereshToken
        await user.save({validateBeforeSave: false})
        
        return{accesToken,refereshToken}

    } catch (error) {
        console.error("Token generation error:", error);
        throw new ApiError(500, "Somthing went wrong while generating Access and Referesh Token")
    }
}

const registerUser = asyncHandler (async(req,res) =>{
    // get user detail from frontend
    // validatino -  no empty
    // check if user allready exists: username / emial
    // check for images, check for avatar
    // upload them to cloudinary, avatar
    // create user object - create entry in db
    // remove password and refresh token field from resonse
    // check for user creation
    // return res

    const {fullName, email, username, password} = req.body
    //console.log("email: ", email);

    if(
        [fullName,email,username,password].some((field)=>field?.trim()==="")
        
    ){
            throw new ApiError(400,"All fields are required")
    }

    const existstedUser = await User.findOne({
        $or: [{ username } , { email }]
    })
    if(existstedUser){
        throw new ApiError(409,"user with email or username allready exists")
    }
    
    const avatarLocalPath = req.files?.avatar[0]?.path;
   // const coverImageLoaclPath = req.files?.coverImage[0]?.path;

    let coverImageLoaclPath;
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0){
        coverImageLoaclPath = req.files.coverImage[0].path;
    }

    if(!avatarLocalPath){
        throw new ApiError(400,"Avatar file is required")
    }

    const avatar = await uploadCloudinary(avatarLocalPath)
    const coverImage = await uploadCloudinary(coverImageLoaclPath)

    if(!avatar){
        throw new ApiError(400,"Avatar file is required")
    }

    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase()
    })

    const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
    )

    if(!createdUser){
        throw new ApiError(500,"Somthing went wrong while registering the user")
    }

    return res.status(201).json(
        new ApiResponse(200, createdUser,"User registered Successfully")

    )
})

const loginUser = asyncHandler(async(req,res)=>{
    /* req body => data
       check username or email
       find the user
       cehck the password
       access and refresh token 
       send cookies
       send response login successfully 
    */
    const {email, username , password} = req.body
    if(!(username || email)){
        throw new ApiError(400,"userName or email is required")
    }
    const user = await User.findOne({
        $or: [{username} , {email}]
    })

    if (!user) {
        throw new ApiError(404,"User does not exist")
    }

    const isPassowrdValid = await user.isPasswordCorrect(password);

    if (!isPassowrdValid) {
        throw new ApiError(401,"invalid User Cradentials")
    }   

    const {accesToken,refereshToken} = await generateAccessAndRefereshToken(user._id)

    const logedinUser = await User.findById(user._id).select("-password -refreshToken")

    const options ={
        httpOnly: true,
        secure: true

    }

    return res
    .status(200)
    .cookie("accessToken",accesToken,options)
    .cookie("referesToken",refereshToken,options)
    .json(
        new ApiResponse(
            200,
            {user: logedinUser,accesToken,refereshToken},
            "User loggedIn SuccessFully"
        )
    )

     
})

const logoutUser = asyncHandler(async(req,res)=>{
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: undefined
            }    
        },
        {
            new: true,
        }
    )
    const options ={
        httpOnly: true,
        secure: true
    }
    res.status(200).clearCookie("accessToken", options).clearCookie("referesToken",options)
    .json(new ApiResponse(200,{},"User Loged out"))
})

export {
    registerUser,
    loginUser,
    logoutUser
}